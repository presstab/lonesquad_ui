class NFT {
    constructor(metadata, address, id, isSelected = false, teamId = "") {
      this.metadata = metadata;
      this.address = address;
      this.id = id;
      this.isSelected = isSelected;
      this.teamId = teamId;
    }
  
    displayInfo() {
      console.log(`NFT ID: ${this.id}`);
      console.log(`Address: ${this.address}`);
      console.log(`Metadata: ${JSON.stringify(this.metadata)}`);
    }
  }
  
  export default NFT;