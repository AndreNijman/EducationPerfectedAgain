// utils.js
// Common helpers used across modules

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const cleanString = s =>
  String(s)
    .replace(/\([^)]*\)/g, '')
    .split(/[;]/)[0]
    .trim();

const randStr = (min, max) => {
  const len = Math.floor(Math.random() * (max - min + 1)) + min;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: len })
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join('');
};

module.exports = { sleep, cleanString, randStr };
