import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import babel from 'rollup-plugin-babel';
import sass from 'rollup-plugin-sass';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import html from 'rollup-plugin-html';
import {argv} from 'yargs';
import {get} from 'lodash';
import minify from 'rollup-plugin-babel-minify';
import json from 'rollup-plugin-json';
import cssnano from 'cssnano';
import postcssBanner from 'postcss-banner';
import packageJson from './package.json';

const {version} = packageJson;
const isDev = get(argv, 'w', false);

const bannerText = `oi-select v${version}`;
let plugins = [
    babel({
        exclude: 'node_modules/**',
    }),
    sass({
        output: 'dist/select.css',
        processor: css => postcss([autoprefixer, postcssBanner({banner: bannerText, inline: true})])
            .process(css, {from: undefined})
            .then(result => result.css)
    }),
    html(),
    json(),
];

if (isDev) {
    plugins = plugins.concat([
        serve({
            open: true,
            verbose: true,
            contentBase: './',
            host: 'localhost',
            port: 3000,
        }),
        livereload('dist'),
    ])
}
let entry = [
    {
        input: 'src/index-tpls.js',
        output: {
            name: 'select',
            file: 'dist/select-tpls.js',
            format: 'cjs'
        },
        plugins,
    },
];

if (!isDev) {
    const minifyPlugins = plugins.concat([
        minify({
            removeConsole: true,
            removeDebugger: true,
            comments: false,
            banner: `// ${bannerText} `,
            bannerNewLine: true,
        }),
        sass({
            output: 'dist/select.min.css',
            processor: css => postcss([autoprefixer, cssnano, postcssBanner({banner: bannerText, inline: true})])
                .process(css, {from: undefined})
                .then(result => result.css)
        }),
    ]);
    entry = entry.concat([
        {
            input: 'src/index.js',
            output: {
                name: 'select',
                file: 'dist/select.js',
                format: 'cjs'
            },
            plugins,
        },
        {
            input: 'src/index.js',
            output: {
                name: 'select',
                file: 'dist/select.min.js',
                format: 'cjs'
            },
            plugins: minifyPlugins,
        },
        {
            input: 'src/index-tpls.js',
            output: {
                name: 'select',
                file: 'dist/select-tpls.min.js',
                format: 'cjs'
            },
            plugins: minifyPlugins,
        },
    ]);
}
export default entry;
