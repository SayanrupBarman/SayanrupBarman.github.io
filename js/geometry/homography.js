/**
 * Planar perspective mapping between two quadrilaterals.
 *
 * The tape is drawn inside a CSS-3D scene, so a straight line on the tape is a
 * skewed, foreshortened line on screen. Given the tape's four projected
 * corners, a homography converts any pointer position back into flat tape
 * coordinates — exactly, not approximately.
 */

const EPSILON = 1e-10;

/** Solve A·x = b with Gaussian elimination and partial pivoting. */
function solveLinear(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < EPSILON) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let c = col; c <= n; c += 1) a[r][c] -= f * a[col][c];
    }
  }
  return a.map((row, i) => row[n] / row[i]);
}

/**
 * @param {{x:number,y:number}[]} src four source corners
 * @param {{x:number,y:number}[]} dst four matching destination corners
 * @returns {number[]|null} 3×3 matrix (row-major, h33 = 1), or null if degenerate
 */
export function solveHomography(src, dst) {
  if (!Array.isArray(src) || !Array.isArray(dst) || src.length !== 4 || dst.length !== 4) return null;
  const rows = [];
  const rhs = [];
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    rhs.push(u);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    rhs.push(v);
  }
  const h = solveLinear(rows, rhs);
  if (!h || h.some((n) => !Number.isFinite(n))) return null;
  return [...h, 1];
}

/** Map a point through a homography. Returns null for points at infinity. */
export function applyHomography(h, p) {
  if (!h || !p) return null;
  const w = h[6] * p.x + h[7] * p.y + h[8];
  if (Math.abs(w) < EPSILON) return null;
  return {
    x: (h[0] * p.x + h[1] * p.y + h[2]) / w,
    y: (h[3] * p.x + h[4] * p.y + h[5]) / w,
  };
}
