import React, { useState } from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';

const App = () => {
	const [count, setCount] = useState(0);
	const { exit } = useApp();

	useInput((input, key) => {
		if (input === 'q') {
			exit();
		}

		if (key.upArrow) {
			setCount(prev => prev + 1);
		}

		if (key.downArrow) {
			setCount(prev => Math.max(0, prev - 1));
		}
	});

	return (
		<Box flexDirection="column">
			<Text color="green">
				Welcome to cctime - Built with Ink!
			</Text>
			<Text>
				Counter: <Text color="yellow">{count}</Text>
			</Text>
			<Box marginTop={1}>
				<Text dimColor>
					Use arrow keys to change the counter. Press 'q' to quit.
				</Text>
			</Box>
		</Box>
	);
};

render(<App />);