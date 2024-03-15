class NFT {
    constructor(metadata, address, id, isSelected = false, teamId = "", isLocked = false) {
      this.metadata = metadata;
      this.address = address;
      this.id = id;
      this.isSelected = isSelected;
      this.teamId = teamId;
      this.isLocked = isLocked;
    }
  
    displayInfo() {
      console.log(`NFT ID: ${this.id}`);
      console.log(`Address: ${this.address}`);
      console.log(`Metadata: ${JSON.stringify(this.metadata)}`);
    }
  }
  
  export default NFT;