-- Duplicate relations: `A DUPLICATE B` means A is a duplicate of B; B gets DUPLICATED_BY A.
ALTER TYPE "RelationType" ADD VALUE 'DUPLICATE';
ALTER TYPE "RelationType" ADD VALUE 'DUPLICATED_BY';