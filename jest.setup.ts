import fetchMock from "jest-fetch-mock";
import 'jest-ts-auto-mock';
fetchMock.enableMocks();

class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  key(index: number) {
    return Object.keys(this.store)[index] || null;
  }

  store: { [key: string]: string };
  length: number;
}

global.localStorage = new LocalStorageMock;
Object.assign(global, require('jest-chrome'))