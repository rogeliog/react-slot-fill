import React from 'react';

const bus = document.createElement('div');

class Manager {
  constructor() {
    this.handleFillMount = this.handleFillMount.bind(this);
    this.handleFillUpdated = this.handleFillUpdated.bind(this);
    this.handleFillUnmount = this.handleFillUnmount.bind(this);

    /**
     * // The name of the slot
     * type Name = string;
     *
     * // The callback function a Fill uses to be notified when a Slot changes
     * type Listener = (components: Component[]) => void
     *
     * // The Fill and it's corresponding React Element
     * interface Component {
     *  name: Name;
     *  fill: Fill;
     *  element: React.Element;
     * }
     *
     * interface FillRegistration {
     *   listeners: Listener[];
     *   components: Component[];
     * }
     */

    this._db = {
      /**
       * {[key: Name]: FillRegistration
       */
      byName: {},

      /**
       * Map<Fill, Component>
       */
      byFill: new Map()
    };

    bus.addEventListener('fill-mount', this.handleFillMount);
    bus.addEventListener('fill-updated', this.handleFillUpdated);
    bus.addEventListener('fill-unmount', this.handleFillUnmount);
  }

  handleFillMount({ detail: { fill } }) {
    const elements = React.Children.toArray(fill.props.children);
    const name = fill.props.name;
    const component = { fill, elements, name };

    // If the name is already registered
    if (this._db.byName[name]) {
      this._db.byName[name].components.push(component);
    } else {
      this._db.byName[name] = {
        listeners: [],
        components: [component]
      }
    }

    this._db.byFill.set(fill, component);

    // notify listeners
    this._db.byName[name].listeners.forEach(fn =>
      fn(this._db.byName[name].components));
  }

  handleFillUpdated({ detail: { fill } }) {
    // Find the component
    const component = this._db.byFill.get(fill);

    // Get the new elements
    const newElements = React.Children.toArray(fill.props.children);

    // replace previous element with the new one
    component.elements = newElements;

    const name = component.name;

    // notify listeners
    this._db.byName[name].listeners.forEach(fn => {
      fn(this._db.byName[name].components)
    });
  }

  handleFillUnmount({ detail: { fill } }) {
    const oldComponent = this._db.byFill.get(fill);

    const name = oldComponent.name;

    const components = this._db.byName[name].components;

    // remove previous component
    components.splice(components.indexOf(oldComponent), 1);

    // Clean up byFill reference
    this._db.byFill.delete(fill);

    if (this._db.byName[name].listeners.length === 0 &&
      this._db.byName[name].components.length === 0) {
      delete this._db.byName[name];
    } else {
      // notify listeners
      this._db.byName[name].listeners.forEach(fn =>
        fn(this._db.byName[name].components));
    }
  }

  /**
   * Triggers once immediately, then each time the components change for a location
   *
   * name: String, fn: (components: Component[]) => void
   */
  onComponentsChange(name, fn) {
    if (this._db.byName[name]) {
      this._db.byName[name].listeners.push(fn);
    } else {
      this._db.byName[name] = {
        listeners: [fn],
        components: []
      }
    }

    fn(this._db.byName[name].components);
  }

  /**
   * Removes previous listener
   *
   * name: String, fn: (components: Component[]) => void
   */
  removeOnComponentsChange(name, fn) {
    const listeners = this._db.byName[name].listeners;
    listeners.splice(listeners.indexOf(fn), 1);
  }
}

const manager = new Manager();

export class Slot extends React.Component {
  constructor(props) {
    super(props);
    this.state = { components: [] };
    this.handleComponentChange = this.handleComponentChange.bind(this);
  }

  componentWillMount() {
    manager.onComponentsChange(this.props.name, this.handleComponentChange);
  }

  /**
   * components: Component[]
   */
  handleComponentChange(components) {
    // debugger;
    this.setState({ components });
  }

  get fills() {
    return this.state.components.map(c => c.fill);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.name !== this.props.name) {
      manager.removeOnComponentsChange(this.props.name, this.handleComponentChange);

      const name = nextProps.name;

      manager.onComponentsChange(name, this.handleComponentChange);
    }
  }

  componentWillUnmount() {
    const name = this.props.name;
    manager.removeOnComponentsChange(name, this.handleComponentChange);
  }

  render() {
    const aggElements = [];

    this.state.components.forEach((component, index) => {
      const { fill, elements } = component;

      if (this.props.fillChildProps) {
        const fillChildProps = Object.keys(this.props.fillChildProps).reduce((acc, key) => {
          const value = this.props.fillChildProps[key]

          if (typeof value === 'function') {
            acc[key] = () => value(fill, this.fills);
          } else {
            acc[key] = value;
          }

          return acc;
        }, {});

        elements.forEach((element, index2) => {
          aggElements.push(
            React.cloneElement(element, { key: index.toString() + index2.toString(), ...fillChildProps })
          )
        });
      } else {
        elements.forEach((element, index2) => {
          aggElements.push(
            React.cloneElement(element, { key: index.toString() + index2.toString() })
          );
        });
      }
    });

    if (typeof this.props.children === 'function') {
      const results = this.props.children(aggElements);

      if (results) {
        return results;
      } else {
        return null;
      }
    } else {
      // debugger;
      return aggElements;
    }
  }
}

export class Fill extends React.Component {
  componentWillMount() {
    bus.dispatchEvent(new CustomEvent('fill-mount', {
      detail: {
        fill: this
      }
    }));
  }

  componentDidUpdate(prevProps) {
    bus.dispatchEvent(new CustomEvent('fill-updated', {
      detail: {
        fill: this,
      }
    }));
  }

  componentWillUnmount() {
    bus.dispatchEvent(new CustomEvent('fill-unmount', {
      detail: {
        fill: this,
      }
    }))
  }

  render() {
    return null;
  }
}