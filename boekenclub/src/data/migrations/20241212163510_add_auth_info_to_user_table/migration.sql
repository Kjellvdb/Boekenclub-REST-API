/*
  Warnings:

  - A unique constraint covering the columns `[website]` on the table `libraries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `libraries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `readers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password_hash` to the `readers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roles` to the `readers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `readers` ADD COLUMN `password_hash` VARCHAR(255) NOT NULL,
    ADD COLUMN `roles` JSON NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `idx_library_website_unique` ON `libraries`(`website`);

-- CreateIndex
CREATE UNIQUE INDEX `idx_library_email_unique` ON `libraries`(`email`);

-- CreateIndex
CREATE UNIQUE INDEX `idx_reader_email_unique` ON `readers`(`email`);
