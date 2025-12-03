// Admin credentials - stored in .env file
// Add more admins by adding entries to the admins array
const config = {
  admins: [
    { username: 'owenjeej', password: 'ojrt1234' }
  ]
};

function validateAdmin(username, password) {
  const admin = config.admins.find(a => a.username.toLowerCase() === username.toLowerCase());
  return admin && admin.password === password;
}
