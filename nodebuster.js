#!/usr/bin/node
process.title = 'nodebuster';

const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const debug = require('debug')('nodebuster');
const status_regex = /^[123][0-9][0-9]$|^40[135]$/;

const args = require('argv').option([
	{name:'url', type:'string'},
	{name:'wordlist', type:'string'},
	{name:'extensions', type:'string'},
	{name:'proxy', type:'string'},
	{name:'proxyauth', type:'string'},
	{name:'cookies', type:'boolean'},
	{name:'help', type:'boolean'}
]).run().options;

if(args.help){
	console.log('HELP!!!');
	process.exit(0);
}else{
	if(!fs.existsSync(args.wordlist)){
		console.error('Unable to open wordlist');
		process.exit(1);
	}
}

var words = [];
var extensions = [];
if(args.extensions) extensions = args.extensions.split(',');

// {{{ axios config
var axios_config = {
	// `headers` are custom headers to be sent
	headers: {'X-Requested-With': 'XMLHttpRequest'},
	// `timeout` specifies the number of milliseconds before the request times out.
	// If the request takes longer than `timeout`, the request will be aborted.
	timeout: 60000,
	// `auth` indicates that HTTP Basic auth should be used, and supplies credentials.
	// This will set an `Authorization` header, overwriting any existing
	// `Authorization` custom headers you have set using `headers`.
	auth: {
		username: 'janedoe',
		password: 's00pers3cret'
	},
	// `responseType` indicates the type of data that the server will respond with
	// options are 'arraybuffer', 'blob', 'document', 'json', 'text', 'stream'
	responseType: 'text',
	// `maxContentLength` defines the max size of the http response content allowed
	maxContentLength: (1024^2)*2, //2MB
	// `validateStatus` defines whether to resolve or reject the promise for a given
	// HTTP response status code. If `validateStatus` returns `true` (or is set to `null`
	// or `undefined`), the promise will be resolved; otherwise, the promise will be
	// rejected.
	validateStatus: null,
	//validateStatus: function (status) {
	//	return status >= 200 && status < 300; // default
	//},
	// `maxRedirects` defines the maximum number of redirects to follow in node.js.
	// If set to 0, no redirects will be followed.
	maxRedirects: 0, // default
	// 'proxy' defines the hostname and port of the proxy server
	// Use `false` to disable proxies, ignoring environment variables.
	// `auth` indicates that HTTP Basic auth should be used to connect to the proxy, and
	// supplies credentials.
	proxy: false,
};

if(args.proxy){
	axios_config.proxy = {
		host: args.proxy.replace(/:.*/, ''),
		port: args.proxy.replace(/.*:/, '')
	};
	if(args.proxyauth){
		axios_config.proxy.auth = {
			username: args.proxy.replace(/^([^:]*):.*/, '\1'),
			password: args.proxy.replace(/^[^:]*:/, '')
		};
	}
}
// }}}

var md5 = (data) => {
	return crypto.createHash('md5').update(data).digest('hex');
}

var get = (url) => {
	return new Promise((resolve, reject) => {
		axios.get(url, axios_config)
		.then(response => {
			if(status_regex.test(response.status)){
				var out = 'url: ' + url + '\tstatus: ' + response.status + '\tlength: ' + response.data.length + '\tmd5: ' + md5(response.data);
				if(args.cookies){
					if(response.headers['set-cookie'] !== undefined){
						if(Array.isArray(response.headers['set-cookie'])){
							for(var i = 0; i < response.headers['set-cookie'].length; i++){
								out = out + '\n\tset-cookie: ' + response.headers['set-cookie'][i];
							}
						}else{
							out = out + '\n\tset-cookie: ' + response.headers['set-cookie'];
						}
					}
				}
				console.log(out);
				resolve(response.status);
			}else{
				//debug('url: ' + url + '\tstatus: ' + response.status);
				resolve(-1);
			}
		})
		.catch(error => {
			console.error(error);
			resolve(-1);
		});
	});
};

var word = (path, word) => {
	var p = [
		get(path + word + '/').then(status => {
			if(status === 200){
				dir(path + word + '/');
			}
		})
	];
	for(var e = 0; e < extensions.length; e++){
		p.push(
			get(path + word + '.' + extensions[e])
		);
	}
	return Promise.all(p);
};

var dir = async (path) => {
	for(var w = 0; w < words.length; w++){
		if(words[w].length === 0) continue;
		if(/^#/.test(words[w])) continue;
		//debug(process.memoryUsage());
		await word(path, words[w]);
	}
};

var load_words = new Promise((resolve, reject) => {
	fs.readFile(args.wordlist, (err, data) => {
		if(err){
			reject(err);
		}else{
			words = data.toString().replace(/\//g, '').split('\n');
			debug('Loaded ' + words.length + ' words from ' + args.wordlist);
			resolve();
		}
	});
}).then(async () => {
	//debug(process.memoryUsage());
	if(/\/$/.test(args.url)){
		await dir(args.url);
	}else{
		await dir(args.url + '/');
	}
	process.exit(0);
});

