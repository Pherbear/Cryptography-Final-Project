const fs = require('fs')
const path = require('path')

const jsonFilePath = path.join(__dirname, 'users.json')

const writeToUsers = (data) => {
  return new Promise((resolve, reject) => {
    let fileData = [];

    // Check if the file exists
    if (fs.existsSync(jsonFilePath)) {
      // Read existing data from the file
      const existingData = fs.readFileSync(jsonFilePath, 'utf8');
      fileData = existingData ? JSON.parse(existingData) : [];
    }

    fileData.push(data)

    fs.writeFile(jsonFilePath, JSON.stringify(fileData, null, 2), (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
const retrieveAccount = (username) => {
    // Check if the file exists
    if (!fs.existsSync(jsonFilePath)) {
        return false
    } else {
        const existingData = fs.readFileSync(jsonFilePath, 'utf8')
        const data = JSON.parse(existingData)
        const filteredName = data.filter(obj => obj.username == username)
        if (filteredName.length == 0) {
            return false
        } else {
            return filteredName[0]
        }
    }
}

module.exports = {writeToUsers, retrieveAccount}