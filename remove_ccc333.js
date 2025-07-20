// Script to remove CCC333 entries from localStorage
console.log("Removing CCC333 entries from localStorage...");

// Get current entries
const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]");
console.log("Current entries:", entries);

// Filter out CCC333 entries
const filteredEntries = entries.filter(entry => entry.plateNumber !== "CCC333");
console.log("Entries after filtering:", filteredEntries);

// Save back to localStorage
localStorage.setItem("parkingEntries", JSON.stringify(filteredEntries));
console.log("CCC333 entries removed successfully!"); 