import { RECOMMENDED_MODAL_WIDTH } from '@dfdao/constants';
import { ModalName } from '@dfdao/types';
import React from 'react';
import { Spacer } from '../Components/CoreUI';
import { useUIManager } from '../Utils/AppHooks';
import { ModalHandle, ModalPane } from '../Views/ModalPane';
import { ArtifactShop } from './ArtifactsList';

function HelpContent() {
  return (
    <div>
      <p>These are all the artifacts you currently own.</p>
      <Spacer height={8} />
      <p>
        The table is interactive, and allows you to sort the artifacts by clicking each column's
        header. You can also view more information about a particular artifact by clicking on its
        name.
      </p>
    </div>
  );
}

export function ShopPane({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const uiManager = useUIManager();

  const render = (handle: ModalHandle) => <ArtifactShop modal={handle} />;

  return (
    <ModalPane
      id={ModalName.Shop}
      title={'Galactic Shop'}
      visible={visible}
      onClose={onClose}
      helpContent={HelpContent}
      width={RECOMMENDED_MODAL_WIDTH}
    >
      {render}
    </ModalPane>
  );
}
