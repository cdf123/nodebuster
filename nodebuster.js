#!/usr/bin/node
process.title = 'nodebuster';

const axios = require('axios');
const fs = require('fs');
const debug = require('debug')('nodebuster');

const args = require('argv').option([
	{name:'url', type:'string'},
	{name:'wordlist', type:'string'},
	{name:'extensions', type:'string'},
	{name:'proxy', type:'string'},
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

var extensions = [];
if(args.extensions) extensions = args.extensions.split(',');

var get = (url) => {
	return new Promise((resolve, reject) => {
		axios.get(url)
		.then(response => {
			//TODO
		})
		.catch(error => {
			console.log(error);
		});
	});
};

var load_words = new Promise((resolve, reject) => {
	fs.readFile(args.wordlist, (err, data) => {
		if(err){
			reject(err);
		}else{
			var list = data.toString().split('\n');
			debug('Loaded ' + list.length + ' words from ' + args.wordlist);
			resolve(list);
		}
	});
}).then(words => {
	p = [];
	for(var w = 0; w < words.length; w++){
		p.push(new Promise((resolve, reject) => {
			p2 = [
				new Promise((resolve, reject) => {
					debug('Testing url: ' + args.url + '/' + words[w]);
					//get(args.url + '/' + words[w]);
				})
			];
			for(var e = 0; e < extensions.length; e++){
				p2.push(new Promise((resolve, reject) => {
					debug('Testing url: ' + args.url + '/' + words[w] + '.' + extensions[e]);
					//get(args.url + '/' + words[w] + '.' + extensions[e]);
				}));
			}
		}));
	}
	return Promise.all(p);
});

