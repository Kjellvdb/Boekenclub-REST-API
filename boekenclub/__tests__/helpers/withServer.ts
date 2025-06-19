import supertest from 'supertest';
import type { Server } from '../../src/createServer';
import createServer from '../../src/createServer';
import { prisma } from '../../src/data';
import { hashPassword } from '../../src/core/password';
import Role from '../../src/core/roles';

export default function withServer(setter: (s: supertest.Agent) => void): void {
  let server: Server;

  beforeAll(async () => {
    server = await createServer();

    const passwordHash = await hashPassword('password1234');
    await prisma.reader.createMany({
      data: [
        {
          id: 1,
          name: 'Test Reader',
          email: 'test.reader@hogent.be',
          address: 'Straat 1, 9000 Gent',
          password_hash: passwordHash,
          roles: [Role.READER],
        },
        {
          id: 2,
          name: 'Admin Reader',
          email: 'admin.reader@hogent.be',
          address: 'Straat 2, 9000 Gent',
          password_hash: passwordHash,
          roles: [Role.READER, Role.ADMIN],
        },
        {
          id: 3,
          name: 'Author Reader',
          email: 'author.reader@hogent.be',
          address: 'Straat 3, 9000 Gent',
          password_hash: passwordHash,
          roles: [Role.READER, Role.AUTHOR],
        },
        {
          id: 4,
          name: 'Second Author Reader',
          email: 'second.author.reader@hogent.be',
          address: 'Straat 4, 9000 Gent',
          password_hash: passwordHash,
          roles: [Role.READER, Role.AUTHOR],
        },
      ],
    });
    await prisma.book.createMany({
      data: [
        {
          isbn: '9783161484100',
          authorId: 3,
          title: 'Test Book 1',
          publicationDate: new Date('2024-12-10'),
        },
        {
          isbn: '9783161484101',
          authorId: 3,
          title: 'Test Book 2',
          publicationDate: new Date('2024-12-10'),
        },
        {
          isbn: '9783161484102',
          authorId: 3,
          title: 'Test Book 3',
          publicationDate: new Date('2024-12-10'),
        },
        {
          isbn: '9783161484103',
          authorId: 3,
          title: 'Test Book 4',
          publicationDate: new Date('2024-12-10'),
        },
        {
          isbn: '9783161484104',
          authorId: 3,
          title: 'Test Book 5',
          publicationDate: new Date('2024-12-10'),
        },
        {
          isbn: '9783161484105',
          authorId: 4,
          title: 'Test Book 6',
          publicationDate: new Date('2024-12-10'),
        },
      ],
    });
    await prisma.savedBooks.createMany({
      data: [
        {
          readerId: 1,
          bookIsbn: '9783161484100',
        },
        {
          readerId: 1,
          bookIsbn: '9783161484101',
        },
        {
          readerId: 1,
          bookIsbn: '9783161484102',
        },
        {
          readerId: 2,
          bookIsbn: '9783161484100',
        },
      ],
    });
    await prisma.review.createMany({
      data: [
        {
          readerId: 1,
          bookIsbn: '9783161484100',
          rating: 5,
          content: 'Een prachtig boek!',
          date: new Date('2024-12-10'),
        },
        {
          readerId: 1,
          bookIsbn: '9783161484101',
          rating: 3,
          content: 'Een mooi boek.',
          date: new Date('2024-12-10'),
        },
        {
          readerId: 1,
          bookIsbn: '9783161484102',
          rating: 4,
          content: 'Een goed boek.',
          date: new Date('2024-12-10'),
        },
        {
          readerId: 2,
          bookIsbn: '9783161484102',
          rating: 3,
          content: 'Een prima boek.',
          date: new Date('2024-12-10'),
        },
      ],
    });
    await prisma.library.createMany({
      data: [
        {
          id: 1,
          name: 'Test library 1',
          website: 'https://www.test.library.1.be',
          email: 'Test.library.1@email.com',
          address: 'Test Address 1',
        },
        {
          id: 2,
          name: 'Test library 2',
          website: 'https://www.test.library.2.be',
          email: 'Test.library.2@email.com',
          address: 'Test Address 2',
        },
      ],
    });
    await prisma.copy.createMany({
      data: [
        {
          sequenceNumber: 1,
          bookIsbn: '9783161484100',
          libraryId: 1,
          condition: 'good',
        },
        {
          sequenceNumber: 2,
          bookIsbn: '9783161484100',
          libraryId: 1,
          condition: 'bad',
        },
        {
          sequenceNumber: 3,
          bookIsbn: '9783161484100',
          libraryId: 2,
          condition: 'good',
        },
        {
          sequenceNumber: 1,
          bookIsbn: '9783161484105',
          libraryId: 2,
          condition: 'good',
        },
      ],
    });
    await prisma.loan.createMany({
      data: [
        {
          id: 1,
          libraryId: 1,
          copySeqNum: 1,
          copyBookIsbn: '9783161484100',
          readerId: 1,
          startDate: new Date('2024-12-10'),
          endDate: new Date('2024-12-11'),
        },
        {
          id: 2,
          libraryId: 1,
          copySeqNum: 2,
          copyBookIsbn: '9783161484100',
          readerId: 1,
          startDate: new Date('2024-12-10'),
          endDate: new Date('2024-12-11'),
        },
      ],
    });

    setter(supertest(server.getApp().callback()));
  });

  afterAll(async () => {
    await prisma.reader.deleteMany();
    await prisma.library.deleteMany();

    await server.stop();
  });
}
