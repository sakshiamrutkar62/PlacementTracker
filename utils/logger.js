const info = (message) => {
    const timestamp = new Date().toISOString();
    console.log(`\x1b[36m[INFO] ${timestamp}:\x1b[0m ${message}`);
};

const error = (message, err) => {
    const timestamp = new Date().toISOString();
    console.error(`\x1b[31m[ERROR] ${timestamp}:\x1b[0m ${message}`);
    if (err) console.error(err);
};

const warn = (message) => {
    const timestamp = new Date().toISOString();
    console.warn(`\x1b[33m[WARN] ${timestamp}:\x1b[0m ${message}`);
};

module.exports = { info, error, warn };