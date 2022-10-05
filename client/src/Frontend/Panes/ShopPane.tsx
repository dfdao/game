import { RECOMMENDED_MODAL_WIDTH } from '@dfdao/constants';
import { ModalName } from '@dfdao/types';
import React from 'react';
import { Spacer } from '../Components/CoreUI';
import { ModalPane } from '../Views/ModalPane';
import { TabbedView } from '../Views/TabbedView';

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
  return (
    <ModalPane
      id={ModalName.Shop}
      title={'Galactic Shop'}
      visible={visible}
      onClose={onClose}
      helpContent={HelpContent}
      width={RECOMMENDED_MODAL_WIDTH}
    >
      <TabbedView
        tabTitles={['Artifacts', 'Ships']}
        tabContents={(i) => {
          switch (i) {
            case 0:
              return <ArtifactShop />;
            case 1:
              return <ShipShop />;
          }
        }}
      />
    </ModalPane>
  );
}

function ArtifactShop(): JSX.Element {
  return <>hello</>;
}

function ShipShop(): JSX.Element {
  return <>goodbye</>;
}
