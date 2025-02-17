import React from 'react';
import DocSidebar from '@theme-original/DocSidebar';
import Logo from '@site/static/img/logo.svg';

export default function DocSidebarWrapper(props) {

  return (
    <>
      <div className="logo__wrapper">
        <Logo className='logo'/>
      </div>
      <DocSidebar {...props} />
    </>
  );
}
