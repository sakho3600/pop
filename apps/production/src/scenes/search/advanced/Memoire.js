import React from "react";
import Mapping from "../../../services/Mapping";
import Card from "../components/MemoireCard";
import AdvancedSearch from "./AdvancedSearch";

export default class Memoire extends React.Component {
  render() {
    return (
      <AdvancedSearch
        collection="memoire"
        mapping={Mapping.memoire}
        basename="Photographies (Mémoire)"
        onData={data => <Card key={data.REF} data={data} />}
      />
    );
  }
}
