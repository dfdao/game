import { RECOMMENDED_MODAL_WIDTH } from '@dfdao/constants';
import { ModalName } from '@dfdao/types';
import React from 'react';
import styled from 'styled-components';
import { CenterBackgroundSubtext, Spacer } from '../Components/CoreUI';
import { useMyArtifactsList, useMySpaceshipsList, useUIManager } from '../Utils/AppHooks';
import { ModalHandle, ModalPane } from '../Views/ModalPane';
import { TabbedView } from '../Views/TabbedView';
import { ArtifactsList } from './ArtifactsList';
import { SpaceshipsList } from './SpaceshipsList';

function HelpContent() {
  return (
    <div>
      <p>These are all the Artifacts and Spaceships currently in your wallet.</p>
      <Spacer height={8} />
      <p>
        The table is interactive, and allows you to sort the data by clicking each column's header.
        You can also view more information about a particular artifact by clicking on its name.
      </p>
    </div>
  );
}

const TabWrapper = styled.div`
  min-height: 200px;
  max-height: 400px;
  overflow-y: scroll;
`;

export function InvetoryPane({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const uiManager = useUIManager();
  const artifacts = useMyArtifactsList(uiManager);
  const spaceships = useMySpaceshipsList(uiManager);

  const render = (handle: ModalHandle) => {
    return (
      <TabWrapper>
        <TabbedView
          style={{ height: '100%' }}
          tabTitles={['artifacts', 'ships']}
          tabContents={(i) => {
            if (i === 0) {
              if (artifacts.length === 0) {
                return (
                  <CenterBackgroundSubtext width='100%' height='100px'>
                    You don't have any <br /> Artifacts in your wallet
                  </CenterBackgroundSubtext>
                );
              }

              return <ArtifactsList artifacts={artifacts} modal={handle} />;
            }

            if (spaceships.length === 0) {
              return (
                <CenterBackgroundSubtext width='100%' height='100px'>
                  You don't have any <br /> Spaceships in your wallet
                </CenterBackgroundSubtext>
              );
            }

            return <SpaceshipsList spaceships={spaceships} modal={handle} />;
          }}
        />
      </TabWrapper>
    );
  };

  return (
    <ModalPane
      id={ModalName.YourInventory}
      title={'Your Inventory'}
      visible={visible}
      onClose={onClose}
      helpContent={HelpContent}
      width={RECOMMENDED_MODAL_WIDTH}
    >
      {render}
    </ModalPane>
  );
}
