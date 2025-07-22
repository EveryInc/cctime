import React from 'react';
import { Box, Text } from 'ink';

interface Column {
  key: string;
  header: string;
  width: number;
}

interface Row {
  [key: string]: any;
  isSelected?: boolean;
}

interface BaseTableProps {
  columns: Column[];
  rows: Row[];
  showBorder?: boolean;
  headerColor?: string;
  selectedRowColor?: string;
}

export const BaseTable: React.FC<BaseTableProps> = ({
  columns,
  rows,
  showBorder = false,
  headerColor = 'white',
  selectedRowColor = 'blue'
}) => {

  if (!rows || rows.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No data available</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header Row */}
      <Box>
        {columns.map((col) => (
          <Box key={col.key} width={col.width} paddingRight={1}>
            <Text bold underline color={headerColor}>
              {col.header}
            </Text>
          </Box>
        ))}
      </Box>
      
      {/* Data Rows */}
      {rows.map((row, rowIndex) => {
        const isSelected = row.isSelected || false;
        return (
          <Box key={rowIndex}>
            {columns.map((col) => (
              <Box key={col.key} width={col.width} paddingRight={1}>
                <Text
                  color={isSelected ? selectedRowColor : undefined}
                  backgroundColor={isSelected ? 'gray' : undefined}
                  bold={isSelected}
                >
                  {row[col.key]}
                </Text>
              </Box>
            ))}
          </Box>
        );
      })}
    </Box>
  );
};