import type supertest from 'supertest';

export const login = async (supertest: supertest.Agent): Promise<string> => {
  const response = await supertest.post('/api/sessions').send({
    email: 'test.reader@hogent.be',
    password: 'password1234',
  });
  if (response.statusCode !== 200) {
    throw new Error(response.body.message || 'Unknown error occured');
  }
  return `Bearer ${response.body.token}`;
};

export const loginAdmin = async (
  supertest: supertest.Agent,
): Promise<string> => {
  const response = await supertest.post('/api/sessions').send({
    email: 'admin.reader@hogent.be',
    password: 'password1234',
  });
  if (response.statusCode !== 200) {
    throw new Error(response.body.message || 'Unknown error occured');
  }
  return `Bearer ${response.body.token}`;
};

export const loginAuthor = async (
  supertest: supertest.Agent,
): Promise<string> => {
  const response = await supertest.post('/api/sessions').send({
    email: 'author.reader@hogent.be',
    password: 'password1234',
  });
  if (response.statusCode !== 200) {
    throw new Error(response.body.message || 'Unknown error occured');
  }
  return `Bearer ${response.body.token}`;
};
