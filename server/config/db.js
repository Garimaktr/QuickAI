import { neon } from '@neondatabase/serverless'

// usin gsql we can read and write data on database url 
const sql = neon(process.env.DATABASE_URL);

export default sql;
