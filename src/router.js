import React from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';
import { ConnectedRouter } from 'react-router-redux';
import { connect } from 'react-redux';

import Home from './scenes/home';
import Notice from './scenes/notice';

export default class PublicRoutes extends React.Component {
  render() {
    return (
      <ConnectedRouter history={this.props.history}>
        <Switch>
          <Route exact path={'/'} component={Home} />
          <Route exact path={'/notice/:id'} component={Notice} />
        </Switch>
      </ConnectedRouter>
    );
  }
}

