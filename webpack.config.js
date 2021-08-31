const ExtensionReloader  = require('webpack-extension-reloader');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

// const contentScripts = {
//   content: './content/index.js'
// }
const extensionPages = {
  // options: './options/index.js',
  popup: './popup/index.ts',
}

let config = {
  mode: process.env.NODE_ENV,
  context: __dirname + '/src'
};

config.node = {
  fs: 'empty',
}

let ExtensionConfig = Object.assign({}, config, {
    entry: {
      background: './background/index.ts',
      // ...contentScripts,
      ...extensionPages
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
    devtool: "source-map",
    plugins: [
      new ExtensionReloader({
        port: 9090,
        reloadPage: true,
        entries: {
          // contentScript: Object.keys(contentScripts),
          extensionPage: Object.keys(extensionPages),
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
        // {
        //   from: './options/index.html',
        //   to: __dirname + '/extension/dist/options.html',
        // },
        // {
        //   from: './options/index.css',
        //   to: __dirname + '/extension/dist/options.css',
        // },
        // {
        //   from: './content/index.css',
        //   to: __dirname + '/extension/dist/content.css',
        // },
      ]),
    ]
});

module.exports = [
    ExtensionConfig,
];
