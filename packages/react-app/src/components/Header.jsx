import { PageHeader } from "antd";
import React from "react";
import "../App.css";

// displays a page header

export default function Header() {
  return (
    <a href="https://github.com/austintgriffith/scaffold-eth" target="_blank" rel="noopener noreferrer">
      <PageHeader className="header"
        title="🏗 scaffold-eth"
        //subTitle="forkable Ethereum dev stack focused on fast product iteration"
        
      />
    </a>
  );
}
