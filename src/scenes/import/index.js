import React, { Component } from 'react';
import { Row, Col, Table, Button, Container, Collapse, Badge } from 'reactstrap';
import { Link } from 'react-router-dom';
import Pagination from "react-js-pagination";
import DropZone from './dropZone'
import Loader from '../../components/loader';
import api from '../../services/api'

import { diff } from './utils.js'

import './index.css';

const COLUMNSTODISPLAY = ['REF', 'TICO', 'DENO'];

export default class ImportComponent extends Component {
  state = {
    displaySummary: false,
    unChanged: [],
    created: [],
    updated: [],
    message: '',
    done: false,
    loading: false
  }

  async onImportFinish(importedNotices) {
    const existingNotices = []
    for (var i = 0; i < importedNotices.length; i++) {
      this.setState({ loading: true, message: `Récuperation des notices existantes ... ${i}/${importedNotices.length}` });
      const notice = await (api.getNotice(importedNotices[i].REF));
      existingNotices.push(notice);
    }
    this.setState({ message: 'Calcule des differences....' })
    const { unChanged, created, updated } = diff(importedNotices, existingNotices);
    this.setState({ displaySummary: true, calculating: false, unChanged, created, updated, loading: false, message: '' });
  }

  async onSave() {
    for (var i = 0; i < this.state.updated.length; i++) {
      this.setState({ loading: true, message: `Mise à jour des notices ... ${i}/${this.state.updated.length}` });
      const id = this.state.updated[i].existingNotice._id;
      const collection = 'merimee';
      const data = {};
      for (var j = 0; j < this.state.updated[i].differences.length; j++) {
        const key = this.state.updated[i].differences[j];
        data[key] = this.state.updated[i].importedNotice[key];
      }
      await api.update(id, collection, data);
    }
    this.setState({ loading: false, done: true, message: `Import effectuée avec succès` });
  }

  renderSummary() {
    if (!this.state.displaySummary) {
      return <div />
    }

    return (
      <div className='import'>
        <UpdatedTableComponent dataSource={this.state.updated} title='Ces notices seront mises à jour' />
        <TableComponent dataSource={this.state.created} title='Ces notices seront créées ' />
        <TableComponent dataSource={this.state.unChanged} title='Ces notices resteront inchangées' />
        <div className='buttons'>
          <Button
            color="primary"
            onClick={() => this.onSave()}
            disabled={!(this.state.updated.length || this.state.created.length)}
          >
            Importer
          </Button>
        </div>
      </div>
    )
  }

  render() {
    if (this.state.loading) {
      return (
        <div className='import-messages'>
          <Loader />
          <div>{this.state.message}</div>
        </div>
      );
    }

    if (this.state.done) {
      return (
        <div className='import-messages'>
          <div>{this.state.message}</div>
          <Link to='/'>Revenir a la page d'accueil</Link>
        </div>
      );
    }

    return (
      <Container>
        <Row className='import' type="flex" gutter={16} justify="center">
          <DropZone
            onFinish={this.onImportFinish.bind(this)}
            storeId={this.props.storeId}
            visible={!this.state.displaySummary}
          />
        </Row>
        {this.renderSummary()}
      </Container >
    );
  }
}


class UpdatedTableComponent extends React.Component {

  state = {
    expandedRef: null,
    activePage: 1,
  }

  render() {
    const { dataSource, title } = this.props;
    if (!dataSource.length) { return <div /> }

    const columnsJSX = [];
    columnsJSX.push(<Col className='col' md='2' key='1'>REF</Col>)
    columnsJSX.push(<Col className='col' md='6' key='2'>TICO</Col>)
    columnsJSX.push(<Col className='col' md='2' key='3'>DENO</Col>)

    const data = [];

    dataSource.forEach((e, i) => {

      //Affichage notices modifiées
      const r = [];
      r.push(<Col className='col' md='2' key='1'>{e.existingNotice.REF}</Col>)
      r.push(<Col className='col' md='6' key='2'>{e.existingNotice.TICO}</Col>)
      r.push(<Col className='col' md='2' key='3'>{e.existingNotice.DENO}</Col>)

      r.push(<Col md='2' className='visu col' key='visu' ><Badge color="danger" id={e.existingNotice.REF} >{e.differences.length}</Badge></Col>)

      data.push(<Row key={i} onClick={() => { this.setState({ expandedRef: e.existingNotice.REF }) }} >{r}</Row>)

      //Affichage des modifications des champs des notices modifiées
      const modifs = e.differences.map(key => <div key={key} >Le champs <b>{key}</b> à évolué de "<b>{e.existingNotice[key]}</b>" à "<b>{e.importedNotice[key]}</b>"</div>)
      data.push(
        <Collapse key={e.existingNotice.REF} isOpen={this.state.expandedRef === e.existingNotice.REF}>
          <div className='col content' >
            {modifs}
          </div>
        </Collapse>
      )
    });

    return (
      <div className='section'>
        <h3 style={{ marginBottom: 16 }}>{title} ({dataSource.length})</h3>
        <div className='table'>
          <Row>{columnsJSX}</Row>
          {data}
        </div>
        <Pagination
          activePage={this.state.activePage}
          itemsCountPerPage={10}
          totalItemsCount={dataSource.length}
          pageRangeDisplayed={5}
          onChange={(p) => { console.log('page', p) }}
        />
      </div >
    )
  }
}


class TableComponent extends React.Component {

  state = {
    expandedRef: null,
    activePage: 1,
  }

  render() {
    const { dataSource, title } = this.props;
    if (!dataSource.length) { return <div /> }

    const columnsJSX = [];
    columnsJSX.push(<Col className='col' md='2' key='1'>REF</Col>)
    columnsJSX.push(<Col className='col' md='8' key='2'>TICO</Col>)
    columnsJSX.push(<Col className='col' md='2' key='3'>DENO</Col>)

    const data = [];

    for (var i = (this.state.activePage - 1) * 10; i < (this.state.activePage * 10) && i < dataSource.length; i++) {

      const r = [];
      r.push(<Col className='col' md='2' key='1'>{dataSource[i].REF}</Col>)
      r.push(<Col className='col' md='8' key='2'>{dataSource[i].TICO}</Col>)
      r.push(<Col className='col' md='2' key='3'>{dataSource[i].DENO}</Col>)

      data.push(<Row key={dataSource[i].REF}>{r}</Row>)
    }

    return (
      <div className='section'>
        <h3 style={{ marginBottom: 16 }}>{title} ({dataSource.length})</h3>
        <div className='table'>
          <Row>{columnsJSX}</Row>
          {data}
        </div>
        <Pagination
          activePage={this.state.activePage}
          itemsCountPerPage={10}
          totalItemsCount={dataSource.length}
          pageRangeDisplayed={5}
          onChange={(p) => { this.setState({ activePage: p }) }}
        />
      </div >
    )
  }
}


