/*
  Warnings:

  - You are about to drop the `authors` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `authors` DROP FOREIGN KEY `fk_author_reader`;

-- DropForeignKey
ALTER TABLE `books` DROP FOREIGN KEY `fk_book_author`;

-- DropTable
DROP TABLE `authors`;

-- AddForeignKey
ALTER TABLE `books` ADD CONSTRAINT `fk_book_author` FOREIGN KEY (`authorId`) REFERENCES `readers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
