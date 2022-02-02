// import debugCreator from 'debug';

// const debug = debugCreator('popup:AccountRow')

export default (): { expandedEdit: boolean;} => ({
  get expandedEdit() {
    return this.editActive === this.address
  },
  set expandedEdit(value) {
    this.editActive = value ? this.address : undefined
  },
})