#!/usr/bin/env bun
import { program } from 'commander';
import { render } from 'ink';
import React from 'react';

// Import your main app component
import App from './app.js';

program
	.name('cctime')
	.description('CLI app built with Ink')
	.version('1.0.0')
	.action(() => {
		render(<App />);
	});

program.parse();