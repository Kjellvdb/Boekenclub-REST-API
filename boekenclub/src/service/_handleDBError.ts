import ServiceError from '../core/serviceError';

const handleDBError = (error: any) => {
  const { code = '', message } = error;

  if (code === 'P2002') {
    switch (true) {
      case message.includes('idx_reader_id_unique'):
        throw ServiceError.validationFailed(
          'A reader with this id already exists',
        );
      case message.includes('idx_book_isbn_unique'):
        throw ServiceError.validationFailed(
          'A book with this isbn already exists',
        );
      case message.includes('idx_library_id_unique'):
        throw ServiceError.validationFailed(
          'A library with this id already exists',
        );
      case message.includes('idx_loan_id_unique'):
        throw ServiceError.validationFailed(
          'A loan with this id already exists',
        );
      case message.includes('idx_reader_email_unique'):
        throw ServiceError.validationFailed(
          'A reader with this email already exists',
        );
      case message.includes('idx_library_email_unique'):
        throw ServiceError.validationFailed(
          'A library with this email already exists',
        );
      case message.includes('idx_library_website_unique'):
        throw ServiceError.validationFailed(
          'A library with this website already exists',
        );

      case message.includes('review'):
        throw ServiceError.validationFailed('This review already exists');
      case message.includes('saved'):
        throw ServiceError.validationFailed('This book is already saved');
      case message.includes('reader'):
        throw ServiceError.validationFailed('This reader already exists');
      case message.includes('book'):
        throw ServiceError.validationFailed('This book already exists');
      case message.includes('author'):
        throw ServiceError.validationFailed('This author already exists');
      case message.includes('library'):
        throw ServiceError.validationFailed('This library already exists');
      case message.includes('copy'):
        throw ServiceError.validationFailed('This copy already exists');
      case message.includes('loan'):
        throw ServiceError.validationFailed('This loan already exists');

      default:
        throw ServiceError.validationFailed('This item already exists');
    }
  }

  if (code === 'P2025') {
    switch (true) {
      case message.includes('fk_book_author'):
        throw ServiceError.notFound('This book does not exist');
      case message.includes('fk_savedbook_book'):
        throw ServiceError.notFound('This book does not exist');
      case message.includes('fk_savedbook_reader'):
        throw ServiceError.notFound('This reader does not exist');
      case message.includes('fk_review_book'):
        throw ServiceError.notFound('This book does not exist');
      case message.includes('fk_review_reader'):
        throw ServiceError.notFound('This reader does not exist');
      case message.includes('fk_copy_library'):
        throw ServiceError.notFound('This library does not exist');
      case message.includes('fk_copy_book'):
        throw ServiceError.notFound('This book does not exist');
      case message.includes('fk_loan_reader'):
        throw ServiceError.notFound('This reader does not exist');
      case message.includes('fk_loan_library'):
        throw ServiceError.notFound('This library does not exist');

      case message.includes('saved'):
        throw ServiceError.notFound('No saved books with this id exists');
      case message.includes('review'):
        throw ServiceError.notFound(
          'No review with this reader and book exists',
        );
      case message.includes('book'):
        throw ServiceError.notFound('No book with this isbn exists');
      case message.includes('author'):
        throw ServiceError.notFound('No author with this id exists');
      case message.includes('reader'):
        throw ServiceError.notFound('No reader with this id exists');
      case message.includes('suggested'):
        throw ServiceError.notFound('No suggested books found');
      case message.includes('library'):
        throw ServiceError.notFound('No library with this id exists');
      case message.includes('copy'):
        throw ServiceError.notFound(
          'No copy with this isbn and sequence number exists',
        );
      case message.includes('loan'):
        throw ServiceError.notFound('No loan with this id exists');

      default:
        throw ServiceError.notFound('This item does not exists');
    }
  }

  if (code === 'P2003') {
    switch (true) {
      case message.includes('available'):
        throw ServiceError.conflict('This copy is not available');
      default:
        throw ServiceError.conflict(
          'This item is still linked to another item',
        );
    }
  }

  throw error;
};

export default handleDBError;
