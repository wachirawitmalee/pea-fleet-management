export const branches = ['กฟส.ระโนด','กฟส.สทิงพระ','กฟส.กระแสสินธ์'] as const;
export type Branch = typeof branches[number];
export function fleetBranch(value: unknown): Branch {
  return branches.find(branch => branch === value) ?? branches[0];
}
