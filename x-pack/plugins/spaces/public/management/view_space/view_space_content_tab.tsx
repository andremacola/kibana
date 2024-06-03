/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink } from '@elastic/eui';
import { capitalize } from 'lodash';
import type { FC } from 'react';
import React, { useEffect, useState } from 'react';

import { useViewSpaceServices } from './hooks/view_space_context_provider';
import type { Space } from '../../../common';
import type { SpaceContentTypeSummaryItem } from '../../types';

export const ViewSpaceContent: FC<{ space: Space }> = ({ space }) => {
  const { id: spaceId } = space;
  const { spacesManager, getUrlForApp, navigateToUrl } = useViewSpaceServices();
  const [items, setItems] = useState<SpaceContentTypeSummaryItem[] | null>(null);

  const columns: Array<EuiBasicTableColumn<SpaceContentTypeSummaryItem>> = [
    {
      field: 'type',
      name: 'Type',
      render: (_value: string, item: SpaceContentTypeSummaryItem) => {
        const { icon, displayName } = item;
        return (
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon ?? 'gear'} size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>{capitalize(displayName)}</EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'count',
      name: 'Count',
      render: (value: string, item: SpaceContentTypeSummaryItem) => {
        const href = getUrlForApp('management', {
          path: `/kibana/objects?type=${item.type}`,
        });
        return (
          <EuiLink
            onClick={() => {
              navigateToUrl(href);
            }}
          >
            {value}
          </EuiLink>
        );
      },
    },
  ];

  const getRowProps = (item: SpaceContentTypeSummaryItem) => {
    const { type } = item;
    return {
      'data-test-subj': `space-content-row-${type}`,
      onClick: () => {},
    };
  };

  const getCellProps = (
    item: SpaceContentTypeSummaryItem,
    column: EuiTableFieldDataColumnType<SpaceContentTypeSummaryItem>
  ) => {
    const { type } = item;
    const { field } = column;
    return {
      'data-test-subj': `space-content-cell-${type}-${String(field)}`,
      textOnly: true,
    };
  };

  useEffect(() => {
    const getItems = async () => {
      const result = await spacesManager.getContentForSpace(spaceId);
      const { summary } = result;
      setItems(summary);
    };

    // eslint-disable-next-line no-console
    getItems().catch(console.error);
  }, [spaceId, spacesManager]);

  if (!items) {
    return null;
  }

  return (
    <EuiBasicTable
      tableCaption="Demo of EuiBasicTable"
      items={items}
      rowHeader="firstName"
      columns={columns}
      rowProps={getRowProps}
      cellProps={getCellProps}
    />
  );
};
