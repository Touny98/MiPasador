// Check if we can access the environment variable
console.log('APP_SECRET from process.env:', process.env.APP_SECRET ? 'SET' : 'NOT SET');
if (process.env.APP_SECRET) {
  console.log('Length:', process.env.APP_SECRET.length);
  console.log('First 10 chars:', process.env.APP_SECRET.substring(0, 10));
}