import React from 'react';
import renderer from 'react-test-renderer';
import { Fill, Slot } from '../';

const Toolbar = (props) =>
  <div>
    <Slot name="Toolbar.Item" />
  </div>
    
Toolbar.Item = ({ label }) =>
  <Fill name="Toolbar.Item">
    <button>{label}</button>
  </Fill>

const Footer = (props) =>
  <div>
    <Slot name="Footer.Item" />
  </div>

Footer.Item = ({ href, label }) =>
  <Fill name="Footer.Item">
    <a href={href}>{label}</a>
  </Fill>

it('Fills the a simple slot', () => {
  const Feature = () => <Toolbar.Item label="Home" />;

  const fillComponent = renderer.create([
    <Toolbar />,
    <Feature />,
  ]);

  expect(fillComponent).toMatchSnapshot();
})

it('Fills the appropriate slot', () => {
  const Feature = () => [
    <Toolbar.Item label="Home" />,
    <Toolbar.Item label="About" />,
    <Footer.Item label="Twitter" href="twitter.com/reactjs" />,
  ];

  const fillComponent = renderer.create([
      <Toolbar />,
      <Footer />,
      <Feature />,
    ]);

  expect(fillComponent).toMatchSnapshot();
});