/*
 * CloudFront Function, viewer-request, runtime cloudfront-js-2.0.
 *
 * The site bucket is reached through OAC on the S3 REST endpoint, which has
 * no index-document handling: a request for /projects/ asks S3 for an object
 * literally named "projects/", which does not exist. This maps directory URLs
 * onto the index.html Astro writes for them, and sends every URL to one
 * canonical form.
 *
 *   www.<domain>/...  -> 301 https://<domain>/...   (one canonical host)
 *   /projects         -> 301 /projects/              (one canonical path)
 *   /projects/        -> rewritten to /projects/index.html
 *   /_astro/x.css     -> untouched                   (has a file extension)
 *
 * The runtime accepts only a bare top-level handler: no imports, no exports.
 * Terraform uploads this file verbatim, and the unit tests and the local
 * preview server load this same file through node:vm, so what is tested is
 * byte-for-byte what runs at the edge.
 */

/* exported handler */
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var host = request.headers.host ? request.headers.host.value : '';

  if (host.indexOf('www.') === 0) {
    return redirect('https://' + host.slice(4) + uri + querySuffix(request.querystring));
  }

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }

  // A last segment with no dot is a directory missing its slash. Anything
  // with an extension is a real file and goes to the origin as-is.
  var lastSegment = uri.slice(uri.lastIndexOf('/') + 1);
  if (lastSegment.indexOf('.') === -1) {
    // Collapsing leading slashes matters: a Location of "//evil.example/"
    // is protocol-relative and would send the visitor to another host.
    var path = '/' + uri.replace(/^\/+/, '');
    return redirect(path + '/' + querySuffix(request.querystring));
  }

  return request;
}

function redirect(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: location },
      // The redirect itself is cacheable at the edge and in the browser, but
      // only for a day, so a mistake here does not stick for a year.
      'cache-control': { value: 'public, max-age=86400' },
    },
  };
}

/*
 * Rebuilds the query string for a redirect. Names and values are passed
 * through exactly as the event carries them; repeated parameters arrive as
 * one field with a multiValue array, and every value is kept.
 */
function querySuffix(querystring) {
  var parts = [];

  Object.keys(querystring).forEach(function (name) {
    var field = querystring[name];
    var values = field.multiValue ? field.multiValue : [field];

    values.forEach(function (entry) {
      parts.push(entry.value === '' ? name : name + '=' + entry.value);
    });
  });

  return parts.length > 0 ? '?' + parts.join('&') : '';
}
