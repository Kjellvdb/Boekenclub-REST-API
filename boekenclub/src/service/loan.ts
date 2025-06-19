import { prisma } from '../data';
import type { Loan, LoanCreateInput, LoanUpdateInput } from '../types/loan';
import handleDBError from './_handleDBError';
import * as bookService from './book';
import * as readerService from './reader';
import * as copyService from './copy';
import ServiceError from '../core/serviceError';

const LOAN_SELECT = {
  id: true,
  library: {
    select: {
      id: true,
      name: true,
    },
  },
  copy: {
    select: {
      sequenceNumber: true,
      bookIsbn: true,
    },
  },
  reader: {
    select: {
      id: true,
      name: true,
    },
  },
  startDate: true,
  endDate: true,
};

export const getAll = async (): Promise<Loan[]> => {
  try {
    return await prisma.loan.findMany({
      select: LOAN_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const getById = async (id: number): Promise<Loan> => {
  const loan = await prisma.loan.findUnique({
    where: { id },
    select: LOAN_SELECT,
  });
  if (!loan) {
    throw ServiceError.notFound('No loan with this id exists');
  }
  return loan;
};

export const getLoanedCopies = async (isbn: string): Promise<number[]> => {
  try {
    await bookService.checkBookExists(isbn);
    const loans = await prisma.loan.findMany({
      where: {
        copyBookIsbn: isbn,
      },
      select: {
        copySeqNum: true,
        endDate: true,
      },
    });
    return loans.map((loan) => loan.copySeqNum);
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const getByReaderId = async (readerId: number): Promise<Loan[]> => {
  try {
    await readerService.checkReaderExists(readerId);
    return await prisma.loan.findMany({
      where: {
        readerId,
      },
      select: LOAN_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const create = async (loan: LoanCreateInput): Promise<Loan> => {
  try {
    await bookService.checkBookExists(loan.copyBookIsbn);
    await copyService.checkCopyExists(loan.copyBookIsbn, loan.copySeqNum);
    await readerService.checkReaderExists(loan.readerId);
    await copyService.checkCopyAvailable(loan.copyBookIsbn, loan.copySeqNum);
    const libraryId = await copyService.getLibraryIdByCopy(
      loan.copyBookIsbn,
      loan.copySeqNum,
    );
    return await prisma.loan.create({
      data: { ...loan, libraryId },
      select: LOAN_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const updateById = async (
  id: number,
  changes: LoanUpdateInput,
): Promise<Loan> => {
  try {
    const loanFromId = await prisma.loan.findUnique({
      where: {
        id,
      },
      select: {
        copyBookIsbn: true,
        copySeqNum: true,
        startDate: true,
        endDate: true,
      },
    });
    if (!loanFromId) {
      throw ServiceError.notFound('No loan with this id exists');
    }
    if (
      (changes.copyBookIsbn &&
        changes.copyBookIsbn != loanFromId.copyBookIsbn) ||
      (changes.copyBookIsbn && changes.copySeqNum != loanFromId.copySeqNum)
    ) {
      await bookService.checkBookExists(changes.copyBookIsbn);
      await copyService.checkCopyExists(
        changes.copyBookIsbn,
        changes.copySeqNum,
      );
      await copyService.checkCopyAvailable(
        changes.copyBookIsbn,
        changes.copySeqNum,
      );
    }
    if (
      (changes.startDate &&
        changes.endDate &&
        changes.startDate > changes.endDate) ||
      (changes.startDate &&
        !changes.endDate &&
        changes.startDate > loanFromId.endDate) ||
      (!changes.startDate &&
        changes.endDate &&
        loanFromId.startDate > changes.endDate)
    ) {
      throw ServiceError.validationFailed(
        'The end date must be after the start date',
      );
    }
    if (changes.readerId) {
      await readerService.checkReaderExists(changes.readerId);
    }
    const libraryId = await copyService.getLibraryIdByCopy(
      changes.copyBookIsbn ? changes.copyBookIsbn : loanFromId.copyBookIsbn,
      changes.copySeqNum ? changes.copySeqNum : loanFromId.copySeqNum,
    );
    return await prisma.loan.update({
      where: {
        id,
      },
      data: { ...changes, libraryId },
      select: LOAN_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};

export const deleteById = async (id: number): Promise<void> => {
  try {
    await prisma.loan.delete({
      where: {
        id,
      },
      select: LOAN_SELECT,
    });
  } catch (error: any) {
    throw handleDBError(error);
  }
};
