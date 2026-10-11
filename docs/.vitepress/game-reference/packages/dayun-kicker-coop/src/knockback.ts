/** Host-only horizontal velocity. Positions, rather than impulses, go over the wire. */
export interface ZombieKnockback { x: number; z: number }

export const ZOMBIE_KNOCKBACK = { maxSpeed: 12, deceleration: 30, maxImpulse: 10, baseImpulse: 2, damageScale: .1 } as const;

/** Accumulate pellets/repeated hits without moving their hit volumes mid-shot. */
export function addZombieKnockback(current: ZombieKnockback | undefined,
  direction: ZombieKnockback, damage: number): ZombieKnockback | undefined {
  const length = Math.hypot(direction.x, direction.z);
  if (!Number.isFinite(length) || length < 1e-8 || !Number.isFinite(damage) || damage <= 0) return current;
  const impulse = Math.min(ZOMBIE_KNOCKBACK.maxImpulse, ZOMBIE_KNOCKBACK.baseImpulse + damage * ZOMBIE_KNOCKBACK.damageScale);
  const x = (current?.x ?? 0) + direction.x / length * impulse;
  const z = (current?.z ?? 0) + direction.z / length * impulse;
  const speed = Math.hypot(x, z);
  if (speed < 1e-8) return undefined;
  const scale = Math.min(1, ZOMBIE_KNOCKBACK.maxSpeed / speed);
  return { x: x * scale, z: z * scale };
}

/** Fixed-step displacement and linear damping; even a capped impulse ends in 0.4 s. */
export function advanceZombieKnockback(velocity: ZombieKnockback, dt: number): ZombieKnockback {
  const movement = { x: velocity.x * dt, z: velocity.z * dt };
  const speed = Math.hypot(velocity.x, velocity.z);
  const remaining = speed - ZOMBIE_KNOCKBACK.deceleration * dt;
  const scale = remaining > 1e-8 ? remaining / speed : 0;
  velocity.x *= scale; velocity.z *= scale;
  return movement;
}
