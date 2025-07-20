// Simple script to fix CCC111 record - run this in browser console
console.log("🔧 Fixing CCC111 record...");

// Clear any existing CCC111 records first
let entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]");
entries = entries.filter(entry => entry.plateNumber !== "CCC111");

// Create new CCC111 record with yesterday's date
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(15, 30, 0, 0); // 3:30 PM yesterday

const newCCC111Entry = {
  id: Date.now(),
  plateNumber: "CCC111",
  entryTime: yesterday.toISOString(),
  exitTime: null,
  payment: null,
  isOvernight: false
};

entries.push(newCCC111Entry);
localStorage.setItem("parkingEntries", JSON.stringify(entries));

console.log("✅ CCC111 record updated!");
console.log("Entry time:", yesterday.toLocaleString());
console.log("Current entries:", entries);

// Force page refresh to see changes
console.log("🔄 Refreshing page in 2 seconds...");
setTimeout(() => {
  window.location.reload();
}, 2000); 