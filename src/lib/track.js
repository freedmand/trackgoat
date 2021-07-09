import * as turf from "@turf/turf";
import { kdTree } from "kd-tree-javascript";

const MIN_LINE_SEGMENT = 65;
const MAX_LINE_SEGMENT = 140;
const MAX_LINE_MSE = 5;
const PARALLEL_LINE_ANGLE_THRESHOLD = Math.PI / 6;
const TANGENT_LINE_ANGLE_THRESHOLD = Math.PI / 6;
const MIN_PARALLEL_LINE_DISTANCE = 50;
const MAX_PARALLEL_LINE_DISTANCE = 100;
const COORDS_NEEDED_OVERALL_AMOUNT = 5;

function range(bounds, steps) {
  const results = [];
  let value = -bounds;
  for (let i = 0; i < steps; i++) {
    results.push(-bounds + (i / (steps - 1)) * (bounds * 2));
  }
  return results;
}

const ARC_CENTER_OFFSETS = range(35, 15);

function sqr(x) {
  return x * x;
}

function getPoint(p) {
  return turf.point([p[0], p[1]]);
}

function pointToPointMeters(p1, p2) {
  const point1 = getPoint(p1);
  const point2 = getPoint(p2);
  return turf.distance(point1, point2, { units: "kilometers" }) * 1000;
}

function pointToLineMeters(p, w, v) {
  // Return point to line distance in meters
  const point = turf.point(p);
  const line = turf.lineString([w, v]);
  return turf.pointToLineDistance(point, line, { units: "kilometers" }) * 1000;
}

function bearing(p1, p2) {
  let bearing = turf.bearing(turf.point(p1), turf.point(p2));
  if (bearing < 0) bearing += 180;
  return (bearing / 180) * Math.PI;
}

function angleDifference(a1, a2) {
  return Math.abs(Math.atan2(Math.sin(a1 - a2), Math.cos(a1 - a2)));
}

function midpoint(p1, p2) {
  return turf.getCoord(turf.midpoint(turf.point(p1), turf.point(p2)));
}

function normalizeBearingDegrees(bearingDegrees) {
  while (bearingDegrees < -180) bearingDegrees += 360;
  while (bearingDegrees > 180) bearingDegrees -= 360;
  return bearingDegrees;
}

function destinationMeters(point, bearingDegrees, meters) {
  return turf.getCoord(
    turf.destination(
      turf.point(point),
      meters / 1000,
      normalizeBearingDegrees(bearingDegrees),
      {
        units: "kilometers",
      }
    )
  );
}

function makeTree(coords) {
  const tree = new kdTree(coords.slice(), pointToPointMeters, [0, 1]);
  return tree;
}

function* arcFitness(parallelSegment, nCoords, coordTree) {
  const getFitness = (parallelSegment, top, centerOffset) => {
    // Grab points for the arc
    const lineBearing = turf.bearing(
      turf.point(parallelSegment.mid[top ? 1 : 0]),
      turf.point(parallelSegment.mid[top ? 0 : 1])
    );
    const center = destinationMeters(
      parallelSegment.mid[top ? 0 : 1],
      lineBearing,
      centerOffset
    );

    const anglePadding = 20;
    const angleIterations = 15;
    const searchRadius = 7;
    const bins = [];
    for (let i = 0; i < angleIterations; i++) {
      const angleOffset =
        -90 +
        anglePadding +
        (i / (angleIterations - 1)) * (180 - anglePadding * 2);

      const nearest = coordTree.nearest(
        destinationMeters(
          center,
          lineBearing + angleOffset,
          parallelSegment.radius
        ),
        nCoords,
        searchRadius
      );
      let sum = 0;
      for (let i = 0; i < nearest.length; i++) {
        sum += 1 - nearest[i][1] / searchRadius;
      }
      bins[i] = sum;
    }

    const minBin = Math.min(...bins);
    return {
      score: minBin,
      center,
    };
  };

  const segmentBearing = bearing(...parallelSegment.mid);

  // Identify max fitness for top and bottom segments
  let topBest = null;
  let bottomBest = null;
  let topFitness = 0;
  let bottomFitness = 0;

  // Iterate top = [true, false]
  for (let i = 0; i < 2; i++) {
    const top = i == 0;

    // Evaluate optimal set of parameters with arc center offsets
    for (let j = 0; j < ARC_CENTER_OFFSETS.length; j++) {
      const centerOffset = ARC_CENTER_OFFSETS[j];
      const fitness = getFitness(parallelSegment, top, centerOffset);

      // Update fitness if new max is set
      if (top && fitness.score > topFitness) {
        topBest = {
          point: fitness.center,
          radius: parallelSegment.radius,
          fitness: fitness.score,
        };
        topFitness = fitness.score;
      }
      if (!top && fitness.score > bottomFitness) {
        bottomBest = {
          point: fitness.center,
          radius: parallelSegment.radius,
          fitness: fitness.score,
        };
        bottomFitness = fitness.score;
      }
    }
  }
  yield { topBest, bottomBest, topFitness, bottomFitness };
}

function extractParallelSegment(segments, bearings, midpoints, i, j) {
  // Check for parallel
  const bearing1 = bearings[i];
  const bearing2 = bearings[j];
  const angle = angleDifference(bearing1, bearing2);
  // Check threshold at 0 and 180 degrees
  if (
    (angle > PARALLEL_LINE_ANGLE_THRESHOLD &&
      angle < Math.PI - PARALLEL_LINE_ANGLE_THRESHOLD) ||
    angle > Math.PI + PARALLEL_LINE_ANGLE_THRESHOLD
  ) {
    return null;
  }

  // Lines are parallel. See if the coords should be swapped and get mid-segment
  const p1Dist = pointToPointMeters(segments[i].p1, segments[j].p1);
  const p12Dist = pointToPointMeters(segments[i].p1, segments[j].p2);
  const shouldSwap = p12Dist < p1Dist;
  const midP1 = midpoint(
    segments[i].p1,
    shouldSwap ? segments[j].p2 : segments[j].p1
  );
  const midP2 = midpoint(
    segments[i].p2,
    shouldSwap ? segments[j].p1 : segments[j].p2
  );

  // Lines are parallel. Check for angle between midpoints
  // (should be tangent)
  const averageBearing = (bearing1 + bearing2) / 2;
  const midpoint1 = midpoints[i];
  const midpoint2 = midpoints[j];
  const midpointBearing = bearing(midpoint1, midpoint2);
  const tangentAngle = angleDifference(midpointBearing, averageBearing);
  if (
    tangentAngle < Math.PI / 2 - TANGENT_LINE_ANGLE_THRESHOLD ||
    tangentAngle > Math.PI / 2 + TANGENT_LINE_ANGLE_THRESHOLD
  ) {
    return null;
  }

  // Lines midpoints are in the right place. Check for distance
  // between midpoints
  const midpointDistance = pointToPointMeters(midpoint1, midpoint2);
  if (
    midpointDistance < MIN_PARALLEL_LINE_DISTANCE ||
    midpointDistance > MAX_PARALLEL_LINE_DISTANCE
  ) {
    return null;
  }

  // Segments look good!
  return {
    segments: [segments[i], segments[j]],
    mid: [midP1, midP2],
    radius: midpointDistance / 2,
  };
}

function* identifyParallelSegments(coords) {
  // Iterate through each plausible line segment
  const segments = [];
  const bearings = [];
  const midpoints = [];
  for (const segment of getLineSegments(coords)) {
    segments.push(segment);
    bearings.push(bearing(segment.p1, segment.p2));
    midpoints.push(midpoint(segment.p1, segment.p2));

    // Check all pairwise combos of segments iteratively
    for (let i = 0; i < segments.length - 1; i++) {
      const parallelSegment = extractParallelSegment(
        segments,
        bearings,
        midpoints,
        i,
        segments.length - 1
      );
      if (parallelSegment != null) yield parallelSegment;
    }
  }
}

function* getLineSegments(coords) {
  const contenders = [];
  // Identify long line segments
  function calculateMse(startIndex, endIndex) {
    const p1 = coords[startIndex];
    const p2 = coords[endIndex];
    let total = 0;
    for (let i = startIndex + 1; i < endIndex; i++) {
      const dist = pointToLineMeters(coords[i], p1, p2);
      total += sqr(dist);
    }
    return total / (endIndex - startIndex + 1);
  }

  for (let start = 0; start < coords.length - 1; start++) {
    let contender = null;
    for (let end = start + 1; end < coords.length; end++) {
      const p1 = coords[start];
      const p2 = coords[end];
      const dist = pointToPointMeters(p1, p2);

      // Filter only line segments of the right length
      if (dist < MIN_LINE_SEGMENT) continue;

      // Filter on how straight the line is
      const mse = calculateMse(start, end);

      if (mse > MAX_LINE_MSE) {
        // Too much error
        start = end;
        break;
      }

      // Candidate segment
      if (dist > MAX_LINE_SEGMENT) {
        // Line segment too long, remove from contention
        contender = null;
        // Keep continuing until the line ends
        continue;
      }

      contender = {
        start,
        end,
        p1,
        p2,
        dist,
        mse,
      };
    }

    if (contender != null) {
      yield contender;
    }
  }
}

export function identifyTrack(coords) {
  // Store max overall fitness
  let overallBest = null;
  let overallBestFitness = 0;

  // Store all parallel segments collected
  const parallelSegments = [];

  // Tree helpers
  const nCoords = coords.length;
  const tree = makeTree(coords);

  for (const parallelSegment of identifyParallelSegments(coords)) {
    parallelSegments.push(parallelSegment);

    // Iterate all new best fitnesses to break on earliest/best match
    for (const { topBest, bottomBest, topFitness, bottomFitness } of arcFitness(
      parallelSegment,
      nCoords,
      tree
    )) {
      // See if we can store a new best fitness
      if (topBest != null && bottomBest != null) {
        // Best fitness is the min of top and bottom fitnesses
        const bestFitness = Math.min(topFitness, bottomFitness);
        if (bestFitness > overallBestFitness) {
          // Set new best fitness
          overallBest = {
            mid: [topBest.point, bottomBest.point],
            bearingDegrees: turf.bearing(
              turf.point(topBest.point),
              turf.point(bottomBest.point)
            ),
            radii: [topBest.radius, bottomBest.radius],
            fitness: [topBest.fitness, bottomBest.fitness],
          };
        }
        if (bestFitness > COORDS_NEEDED_OVERALL_AMOUNT) {
          // Return early if we have a good enough solution
          return {
            parallelSegments,
            arc: overallBest,
          };
        }
      }
    }
  }

  return {
    parallelSegments,
    arc: overallBest,
  };
}

export function trackToLine(track) {
  if (track == null || track.arc == null) return null;

  const arcDrawIterations = 50;
  const line = [];

  const project = (coord, radius, top, percent) => {
    const baseDegrees = track.arc.bearingDegrees + (top ? 90 : -90);
    return destinationMeters(coord, baseDegrees + 180 * percent, radius);
  };

  line.push(project(track.arc.mid[0], track.arc.radii[0], true, 0));
  for (let i = 1; i <= arcDrawIterations; i++) {
    line.push(
      project(track.arc.mid[0], track.arc.radii[0], true, i / arcDrawIterations)
    );
  }
  for (let i = 0; i <= arcDrawIterations; i++) {
    line.push(
      project(
        track.arc.mid[1],
        track.arc.radii[1],
        false,
        i / arcDrawIterations
      )
    );
  }
  line.push(project(track.arc.mid[0], track.arc.radii[0], true, 0));
  return line;
}
