import debugCreator from 'debug';

const debug = debugCreator('popup:AccountRow')

export default () => ({
  get expandedEdit() {
    return this.editActive === this.address
  },
  set expandedEdit(value) {
    this.editActive = value ? this.address : undefined
  },
  get expandedNewAlert() {
    return this.newAlertActive === this.address
  },
  set expandedNewAlert(value) {
    this.newAlertActive = value ? this.address : undefined
  },
  get expandedShowAlerts() {
    return this.showAlertsActive === this.address
  },
  set expandedShowAlerts(value) {
    this.showAlertsActive = value ? this.address : undefined
  }
})