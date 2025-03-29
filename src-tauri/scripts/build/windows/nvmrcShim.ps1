# https://gist.github.com/danpetitt/e87dabb707079e1bfaf797d0f5f798f2

function callnvm() {
  # Always use argument version if there is one
  $versionDesired = $args[0]

  if (($versionDesired -eq "" -Or $versionDesired -eq $null) -And (Test-Path .nvmrc -PathType Any)) {
    # if we have an nvmrc and no argument supplied, use the version in the file
    $versionDesired = $(Get-Content .nvmrc).replace( 'v', '' );
  }

  Write-Host "Requesting version '$($versionDesired)'"

  if ($versionDesired -eq "") {
    Write-Host "A node version needs specifying as an argument if there is no .nvmrc"
  } else {
    $response = nvm use $versionDesired;
    if ($response -match 'is not installed') {
      if ($response -match '64-bit') {
        $response = nvm install $versionDesired x64
      } else {
        $response = nvm install $versionDesired x86
      }

      Write-Host $response

      $response = nvm use $versionDesired;
    }

    Write-Host $response
  }
}

Set-Alias Use-Nvmrc -value "callnvm"