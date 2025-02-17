import React from 'react';
import DocSidebar from '@theme-original/DocSidebar';
import Logo from '@site/static/img/logo.svg';
import Link from '@docusaurus/Link';

export default function DocSidebarWrapper(props) {

  return (
    <>
      <Link href="/" className="logo__wrapper">
        <Logo className='logo'/>
      </Link>
      <DocSidebar {...props} />
    </>
  );
}
