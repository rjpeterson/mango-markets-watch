const ExtensionReloader  = require('webpack-extension-reloader');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

let config = {
  mode: process.env.NODE_ENV,
  context: __dirname + '/src',
  node: {
    fs: 'empty'
  }
};

let ExtensionConfig = Object.assign({}, config, {
    entry: {
      background: './background/index.ts',
      popup: './popup/index.ts',
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    output: {
      path: __dirname + '/extension/dist/',
      filename: '[name].dist.js',
    },
    resolve: {
      extensions: ['.ts', '.js', '.json']
    },
    plugins: [
      new ExtensionReloader({
        port: 9090,
        reloadPage: true,
        entries: {
          popup: 'popup',
          background: 'background'
        }
      }),
      new CopyPlugin([
        {
          from: './icons/*',
          to: __dirname + '/extension/dist/',
        },
        {
          from: './popup/index.html',
          to: __dirname + '/extension/dist/popup.html',
        },
        {
          from: './popup/index.css',
          to: __dirname + '/extension/dist/popup.css',
        },
      ]),
    ]
});

module.exports = [
    ExtensionConfig,
];
