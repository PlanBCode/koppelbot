<?
function APILandingHtml($full = true){
  if($full) $html = '<p>Welcome to the XYZ REST API. This page offers an interface to create and execute API calls.</p> <p>For more information please visit: <a href="./doc/api">the API reference</a>.</p>';
  $html .= '
  <table class="xyz-list">
  <tr class="xyz-list-header"><td colspan="3">Request</td></tr>
  <tr><td>uri</td><td colspan="2"><input id="xyz-api-uri" value=""/></td></tr>

  <tr><td>class</td><td colspan="2"><xyz id="xyz-api-entityClass" select="entityClass" uri="/entity/*/id" display="select" showCreateButton="false"/></td></tr>
  <tr><td>id(s)</td><td colspan="2"><input id="xyz-api-entityId" value=""/> </td></tr>
  <tr><td>properties</td><td colspan="2"><input id="xyz-api-property" value=""/> </td></tr>

  <tr class="xyz-list-header" id="xyz-api-filters"><td>Query Filter</td><td>Operator</td><td>Value</td></tr>

  <tr class="xyz-list-header" id="xyz-api-apiOptions"><td>Query Option</td><td>Description</td><td>Value</td></tr>';

  if($full){

  $html.='  <tr><td>method</td><td colspan="2">
      <select id="xyz-api-method" onchange="onMethodChange()">
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>DELETE</option>
        <option>HEAD</option>
        <option>PATCH</option>
      </select>
     </td></tr>
    <tr><td>data</td><td colspan="2"> <input  id="xyz-api-data"/> </td></tr>
    <tr><td>command</td><td colspan="2">
  <select id="xyz-api-commandFlavor" onchange="onCommandChange()">
    <option>url</option>
    <option>curl</option>
    <option>cli</option>
    <option>ui</option>
    <option>embed</option>
  </select>

  <pre style="display:inline-block; line-break: anywhere; white-space: normal; word-break: break-all; word-wrap: break-word;" id="xyz-api-command"></pre></td></tr>

  <tr><td colspan="3"> <input type="submit" value="Execute" onclick="execute()"/></td></tr>
  <tr class="xyz-list-header"><td colspan="3">Response</td></tr>
  <tr><td style="font-family: monospace;" id="xyz-api-status" colspan="3"> </td></tr>
  <tr><td style="font-family: monospace; white-space: pre-wrap;" id="xyz-api-result" colspan="3"> </td></tr>';
  }
  $html.='</table>
  <script>
  const apiOptions = '.file_get_contents('./engine/api/api.json').';
  </script>
  <script>
  '.file_get_contents('./engine/api/api.js').'
  </script>';
  return $html;
}
