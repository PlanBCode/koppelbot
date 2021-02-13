<?
function APILandingHtml($full = true){
  $html = '
  <table class="xyz-list">
  <tr class="xyz-list-header"><td colspan="2">Request</td></tr>
  <tr><td>uri</td><td><input id="xyz-api-uri" value=""/></td></tr>

  <tr><td>class</td><td><xyz id="xyz-api-entityClass" select="entityClass" uri="/entity/*/id" display="select" showCreateButton="false"/></td></tr>
  <tr><td>id(s)</td><td><input id="xyz-api-entityId" value=""/> </td></tr>
  <tr><td>properties</td><td><input id="xyz-api-property" value=""/> </td></tr>

  <tr><td>filters</td><td> TODO </td></tr>
  <tr><td>query options</td><td> TODO</td></tr>';

  if($full){

  $html.='  <tr><td>method</td><td>
      <select id="xyz-api-method" onchange="onMethodChange()">
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>DELETE</option>
        <option>HEAD</option>
        <option>PATCH</option>
      </select>
     </td></tr>
    <tr><td>data</td><td> <input  id="xyz-api-data"/> </td></tr>
    <tr><td>command</td><td>
  <select id="xyz-api-commandFlavor" onchange="onCommandChange()">
    <option>url</option>
    <option>curl</option>
    <option>cli</option>
    <option>ui</option>
    <option>embed</option>
  </select>

  <pre style="display:inline-block; word-break: break-all; word-wrap: break-word;" id="xyz-api-command"></pre></td></tr>

  <tr><td colspan="2"> <input type="submit" value="Execute" onclick="execute()"/></td></tr>
  <tr class="xyz-list-header"><td colspan="2">Response</td></tr>
  <tr><td style="font-family: monospace;" id="xyz-api-status" colspan="2"> </td></tr>
  <tr><td style="font-family: monospace; white-space: pre-wrap;" id="xyz-api-result" colspan="2"> </td></tr>';
  }
  $html.='</table>
  <script>
  '.file_get_contents('./engine/api/api.js').'
  </script>';
  return $html;
}
