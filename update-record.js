// Script to update CCC111 record to yesterday's date for overnight parking simulation
// Run this in the browser console

const updateCCC111Record = () => {
  try {
    // Get current entries
    const entries = JSON.parse(localStorage.getItem("parkingEntries") || "[]");
    
    // Find CCC111 record
    const ccc111Index = entries.findIndex(entry => 
      entry.plateNumber.toLowerCase() === "ccc111"
    );
    
    if (ccc111Index === -1) {
      console.log("CCC111 record not found. Creating new record...");
      
      // Create a new CCC111 record with yesterday's date at 3:30 PM
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(15, 30, 0, 0); // 3:30 PM yesterday
      
      const newEntry = {
        id: Date.now(),
        plateNumber: "CCC111",
        entryTime: yesterday.toISOString(),
        exitTime: null,
        payment: null,
        isOvernight: false
      };
      
      entries.push(newEntry);
      localStorage.setItem("parkingEntries", JSON.stringify(entries));
      console.log("✅ Created CCC111 record with yesterday's date (3:30 PM)");
      console.log("Entry time:", yesterday.toLocaleString());
      
    } else {
      // Update existing CCC111 record
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(15, 30, 0, 0); // 3:30 PM yesterday
      
      entries[ccc111Index].entryTime = yesterday.toISOString();
      entries[ccc111Index].exitTime = null; // Ensure it's still parked
      entries[ccc111Index].payment = null; // Reset payment
      entries[ccc111Index].isOvernight = false; // Reset overnight flag
      
      localStorage.setItem("parkingEntries", JSON.stringify(entries));
      console.log("✅ Updated CCC111 record with yesterday's date (3:30 PM)");
      console.log("Entry time:", yesterday.toLocaleString());
    }
    
    // Display current entries for verification
    console.log("\n📋 Current parking entries:");
    const currentEntries = JSON.parse(localStorage.getItem("parkingEntries") || "[]");
    currentEntries.forEach(entry => {
      const entryDate = new Date(entry.entryTime);
      console.log(`${entry.plateNumber}: ${entryDate.toLocaleString()} ${entry.exitTime ? '(EXITED)' : '(PARKED)'}`);
    });
    
  } catch (error) {
    console.error("❌ Error updating record:", error);
  }
};

// Run the update
updateCCC111Record(); 