-- CreateTable
CREATE TABLE `loans` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `libraryId` INTEGER UNSIGNED NOT NULL,
    `copySeqNum` INTEGER UNSIGNED NOT NULL,
    `copyBookIsbn` VARCHAR(255) NOT NULL,
    `readerId` INTEGER UNSIGNED NOT NULL,
    `startDate` DATETIME(0) NOT NULL,
    `endDate` DATETIME(0) NOT NULL,

    UNIQUE INDEX `idx_loan_id_unique`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `copies` (
    `sequenceNumber` INTEGER UNSIGNED NOT NULL,
    `bookIsbn` VARCHAR(255) NOT NULL,
    `libraryId` INTEGER UNSIGNED NOT NULL,
    `condition` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`sequenceNumber`, `bookIsbn`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `libraries` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `website` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `address` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `idx_library_id_unique`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `readerId` INTEGER UNSIGNED NOT NULL,
    `bookIsbn` VARCHAR(255) NOT NULL,
    `rating` TINYINT UNSIGNED NOT NULL,
    `content` TEXT NOT NULL,
    `date` DATETIME(0) NOT NULL,

    PRIMARY KEY (`readerId`, `bookIsbn`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saved_books` (
    `readerId` INTEGER UNSIGNED NOT NULL,
    `bookIsbn` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`readerId`, `bookIsbn`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `books` (
    `isbn` VARCHAR(255) NOT NULL,
    `authorId` INTEGER UNSIGNED NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `publicationDate` DATETIME(0) NOT NULL,

    UNIQUE INDEX `idx_book_isbn_unique`(`isbn`),
    PRIMARY KEY (`isbn`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `authors` (
    `id` INTEGER UNSIGNED NOT NULL,

    UNIQUE INDEX `idx_author_id_unique`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `readers` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `address` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `idx_reader_id_unique`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `fk_loan_library` FOREIGN KEY (`libraryId`) REFERENCES `libraries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `fk_loan_copy` FOREIGN KEY (`copySeqNum`, `copyBookIsbn`) REFERENCES `copies`(`sequenceNumber`, `bookIsbn`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `fk_loan_reader` FOREIGN KEY (`readerId`) REFERENCES `readers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `copies` ADD CONSTRAINT `fk_copy_book` FOREIGN KEY (`bookIsbn`) REFERENCES `books`(`isbn`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `copies` ADD CONSTRAINT `fk_copy_library` FOREIGN KEY (`libraryId`) REFERENCES `libraries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `fk_review_reader` FOREIGN KEY (`readerId`) REFERENCES `readers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `fk_review_book` FOREIGN KEY (`bookIsbn`) REFERENCES `books`(`isbn`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_books` ADD CONSTRAINT `fk_savedbook_reader` FOREIGN KEY (`readerId`) REFERENCES `readers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_books` ADD CONSTRAINT `fk_savedbook_book` FOREIGN KEY (`bookIsbn`) REFERENCES `books`(`isbn`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `books` ADD CONSTRAINT `fk_book_author` FOREIGN KEY (`authorId`) REFERENCES `authors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authors` ADD CONSTRAINT `fk_author_reader` FOREIGN KEY (`id`) REFERENCES `readers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
