import React from "react";
import Mapping from "../../../services/Mapping";
import Card from "../components/PalissyCard";
import AdvancedSearch from "./AdvancedSearch";

export default class Palissy extends React.Component {
  render() {
    return (
      <AdvancedSearch
        collection="palissy"
        basename="Patrimoine mobilier (Palissy)"
        mapping={Mapping.palissy}
        onData={data => <Card key={data.REF} data={data} />}
      />
    );
  }
}
