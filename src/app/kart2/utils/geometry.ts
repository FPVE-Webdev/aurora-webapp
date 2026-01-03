/**
 * WebGL Geometry Generators for Visual Mode
 *
 * Provides subdivided mesh generation for vertex displacement effects.
 * High-poly geometry is required for smooth vertex shader animations.
 */

export interface MeshData {
  vertices: Float32Array;
  indices: Uint16Array;
  vertexCount: number;
  indexCount: number;
}

/**
 * Generate a subdivided plane mesh for aurora curtain rendering
 *
 * @param resolution - Grid resolution (NxN vertices). Higher = smoother vertex displacement
 * @returns Mesh data ready for WebGL buffer creation
 *
 * PERFORMANCE:
 * - Desktop: 100x100 = 10,000 vertices, ~60,000 triangles
 * - Mobile: 50x50 = 2,500 vertices, ~15,000 triangles
 *
 * COORDINATE SYSTEM:
 * - Vertices range from -1 to 1 (NDC - Normalized Device Coordinates)
 * - UV coordinates range from 0 to 1
 * - Triangle winding: Counter-clockwise (CCW)
 */
export function generateSubdividedPlane(resolution: number): MeshData {
  if (resolution < 2) {
    throw new Error('[Geometry] Resolution must be at least 2');
  }

  const vertices: number[] = [];
  const indices: number[] = [];

  // Generate vertex grid
  for (let y = 0; y <= resolution; y++) {
    for (let x = 0; x <= resolution; x++) {
      // Normalized Device Coordinates (-1 to 1)
      const nx = (x / resolution) * 2 - 1;
      const ny = (y / resolution) * 2 - 1;

      vertices.push(nx, ny);
    }
  }

  // Generate triangle indices (two triangles per grid cell)
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const topLeft = y * (resolution + 1) + x;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + (resolution + 1);
      const bottomRight = bottomLeft + 1;

      // Triangle 1 (top-left, bottom-left, top-right)
      indices.push(topLeft, bottomLeft, topRight);

      // Triangle 2 (top-right, bottom-left, bottom-right)
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    vertexCount: vertices.length / 2, // 2 components per vertex (x, y)
    indexCount: indices.length,
  };
}

/**
 * Get recommended mesh resolution based on device capabilities
 */
export function getRecommendedResolution(isMobile: boolean): number {
  // Mobile: 50x50 grid (2,500 vertices) - balance quality/performance
  // Desktop: 100x100 grid (10,000 vertices) - smooth curtain waves
  return isMobile ? 50 : 100;
}

/**
 * Validate mesh data for WebGL compatibility
 */
export function validateMeshData(mesh: MeshData): boolean {
  if (mesh.vertices.length === 0 || mesh.indices.length === 0) {
    console.error('[Geometry] Mesh has no vertices or indices');
    return false;
  }

  if (mesh.indices.length % 3 !== 0) {
    console.error('[Geometry] Index count must be multiple of 3 (triangles)');
    return false;
  }

  // Check for index overflow (Uint16Array max value is 65535)
  const maxIndex = Math.max(...Array.from(mesh.indices));
  if (maxIndex >= mesh.vertexCount) {
    console.error('[Geometry] Index out of bounds:', maxIndex, '>=', mesh.vertexCount);
    return false;
  }

  return true;
}
