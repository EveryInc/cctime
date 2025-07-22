import React from 'react';
import { Text, Box, Spinner } from 'ink';
import { AppProvider, useApp, useNavigationController, useDataLoader, actions } from './state/index.js';
import { ConfigManager } from './config.js';
import { ExportDialog } from './components/views/ExportDialog.js';

interface AppProps {
	configManager: ConfigManager;
	initialFile?: string;
	initialDir?: string;
	outputFormat?: string;
}

// Main app content component
const AppContent: React.FC<AppProps> = ({ configManager, initialFile, initialDir, outputFormat }) => {
	const { state, dispatch } = useApp();
	const { isLoading, error } = useDataLoader();
	
	// Setup navigation controller
	useNavigationController();

	// Show loading state
	if (isLoading || state.loading) {
		return (
			<Box padding={1}>
				<Text color="blue">
					<Spinner type="dots" /> Loading response time data...
				</Text>
			</Box>
		);
	}

	// Show error state
	if (error || state.error) {
		return (
			<Box padding={1}>
				<Text color="red">
					Error: {error?.message || state.error}
				</Text>
			</Box>
		);
	}

	// Render based on current view
	const renderView = () => {
		switch (state.ui.view) {
			case 'dashboard':
				return (
					<Box flexDirection="column" padding={1}>
						<Text color="green" bold>
							Claude Code Transcript Time Analyzer
						</Text>
						<Box marginTop={1}>
							<Text>
								View: <Text color="yellow">{state.ui.view}</Text>
							</Text>
							<Text>
								Sort: <Text color="yellow">{state.ui.sortBy} ({state.ui.sortOrder})</Text>
							</Text>
							<Text>
								Selected Index: <Text color="cyan">{state.ui.selectedIndex}</Text>
							</Text>
						</Box>
						{initialFile && (
							<Text marginTop={1}>
								File: <Text color="cyan">{initialFile}</Text>
							</Text>
						)}
						{initialDir && (
							<Text>
								Directory: <Text color="cyan">{initialDir}</Text>
							</Text>
						)}
						<Text>
							Output Format: <Text color="magenta">{outputFormat || configManager.get('defaultOutputFormat')}</Text>
						</Text>
						<Box marginTop={1}>
							<Text dimColor>
								Navigation: ↑/↓ to select, Enter for details, 'o' to sort
							</Text>
							<Text dimColor>
								Views: 'd' dashboard, 'e' export, 's' settings, 'q' quit
							</Text>
						</Box>
					</Box>
				);
			
			case 'details':
				return (
					<Box flexDirection="column" padding={1}>
						<Text color="blue" bold>
							Date Details: {state.ui.selectedDate || 'None'}
						</Text>
						<Box marginTop={1}>
							<Text dimColor>
								Press ESC or 'b' to go back to dashboard
							</Text>
						</Box>
					</Box>
				);
			
			case 'export':
				return (
					<ExportDialog 
						onClose={() => {
							// Navigate back to dashboard when export dialog closes
							dispatch(actions.setView('dashboard'));
						}}
					/>
				);
			
			case 'settings':
				return (
					<Box flexDirection="column" padding={1}>
						<Text color="cyan" bold>
							Settings
						</Text>
						<Box marginTop={1}>
							<Text>Watch Mode: <Text color={state.settings.watchMode ? 'green' : 'red'}>{state.settings.watchMode ? 'ON' : 'OFF'}</Text></Text>
							<Text>Refresh Interval: <Text color="yellow">{state.settings.refreshInterval}ms</Text></Text>
							<Text>Show Percentiles: <Text color={state.settings.showPercentiles ? 'green' : 'red'}>{state.settings.showPercentiles ? 'YES' : 'NO'}</Text></Text>
							<Text>Export Path: <Text color="yellow">{state.settings.exportPath}</Text></Text>
						</Box>
						<Box marginTop={1}>
							<Text dimColor>
								Press TAB to navigate, SPACE to toggle, ESC to go back
							</Text>
						</Box>
					</Box>
				);
			
			default:
				return <Text>Unknown view</Text>;
		}
	};

	return renderView();
};

// Root app component with provider
const App: React.FC<AppProps> = (props) => {
	return (
		<AppProvider>
			<AppContent {...props} />
		</AppProvider>
	);
};

export default App;